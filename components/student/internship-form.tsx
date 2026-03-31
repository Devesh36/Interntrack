"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { Upload, Send, BookOpen, Layers, ArrowLeft } from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface DepartmentCoordinator {
  id: string;
  branch: string;
  email: string;
  name: string;
}

interface InternshipFormProps {
  onSubmit: () => void;
  onBack: () => void;
}

const DIVISIONS = ["A", "B", "C", "D"];

const formatCurrencyInput = (value: string) => value.replace(/[^\d]/g, "");

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateEndDate = (startDate: string, durationWeeks: string) => {
  const weeks = Number.parseInt(durationWeeks, 10);
  if (!startDate || Number.isNaN(weeks) || weeks < 1) {
    return "";
  }

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    return "";
  }

  const end = new Date(start);
  end.setDate(end.getDate() + weeks * 7 - 1);
  return formatDateInput(end);
};

export function InternshipForm({ onSubmit, onBack }: InternshipFormProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [deptCoordinators, setDeptCoordinators] = useState<
    DepartmentCoordinator[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    class: "",
    teacherId: "",
    branch: "",
    division: "",
    companyName: "",
    companyLocation: "",
    domain: "",
    durationWeeks: "",
    startDate: "",
    endDate: "",
    stipend: "",
    stipendAmount: "",
    mode: "",
    offerLetterURL: "",
    deptCoordinatorEmail: "",
    hrEmail: "",
  });

  useEffect(() => {
    fetchTeachers();
    fetchDeptCoordinators();
  }, []);

  useEffect(() => {
    const nextEndDate = calculateEndDate(
      formData.startDate,
      formData.durationWeeks,
    );

    setFormData((prev) =>
      prev.endDate === nextEndDate ? prev : { ...prev, endDate: nextEndDate },
    );
  }, [formData.startDate, formData.durationWeeks]);

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/users/teachers");
      if (response.ok) {
        const data = await response.json();
        setTeachers(data);
      } else {
        toast.error("Could not load teachers list.");
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      toast.error("Failed to load teachers : A network error occurred.");
    }
  };

  const fetchDeptCoordinators = async () => {
    try {
      const response = await fetch("/api/dept-coordinator");

      if (response.ok) {
        const data = await response.json();
        if (data.coordinators && Array.isArray(data.coordinators)) {
          setDeptCoordinators(data.coordinators);
        } else if (Array.isArray(data)) {
          setDeptCoordinators(data);
        }
      } else {
        toast.error("Could not load department coordinators.");
      }
    } catch (error) {
      console.error("Failed to fetch coordinators:", error);
      toast.error("Failed to load coordinators : A network error occurred.");
    }
  };

  const handleBranchChange = (value: string) => {
    setFormData((prev) => ({ ...prev, branch: value }));

    //find coordinator for the selected branch
    const deptCoordinator = deptCoordinators.find((c) => c.branch === value);
    if (deptCoordinator) {
      setFormData((prev) => ({
        ...prev,
        deptCoordinatorEmail: deptCoordinator.email,
        deptCoordinatorId: deptCoordinator.id,
      }));
    }
  };

  const showStipendAmountField = formData.stipend === "paid";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/internship-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSuccess(true);
        toast.success("Your internship form has been sent for approval.");
        setFormData({
          name: "",
          class: "",
          teacherId: "",
          branch: "",
          division: "",
          companyName: "",
          companyLocation: "",
          domain: "",
          durationWeeks: "",
          startDate: "",
          endDate: "",
          stipend: "",
          stipendAmount: "",
          mode: "",
          offerLetterURL: "",
          deptCoordinatorEmail: "",
          hrEmail: "",
        });
        setTimeout(() => {
          onSubmit();
        }, 1500);
      } else {
        const data = await response.json();
        const msg = data.error || "Failed to submit form";
        toast.error(msg);
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const branches = deptCoordinators.map((c) => c.branch);

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Form Submitted Successfully!
            </h3>
            <p className="text-gray-600">
              Your internship form has been sent to your academic teacher for
              approval.
            </p>
            <Button onClick={onBack} variant="outline" className="mt-6">
              Back to All Forms
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-gray-100 pb-6">
        <div className="mb-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="px-0 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Forms
          </Button>
        </div>
        <CardTitle>Internship Registration Form</CardTitle>
        <CardDescription>
          Submit your internship details for teacher approval
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-5">
              <div className="mb-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                  Student Details
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Basic academic information for this internship request.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Student Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Class/Year *</Label>
                  <Select
                    value={formData.class}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, class: value }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FE">First Year (FE)</SelectItem>
                      <SelectItem value="SE">Second Year (SE)</SelectItem>
                      <SelectItem value="TE">Third Year (TE)</SelectItem>
                      <SelectItem value="BE">Final Year (BE)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacher">
                    Internship Coordinator (Teacher) *
                  </Label>
                  <Select
                    value={formData.teacherId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, teacherId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your internship coordinator" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch *</Label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Select
                        value={formData.branch}
                        onValueChange={handleBranchChange}
                        required
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select your branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b} value={b}>
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="division">Division *</Label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                      <Select
                        value={formData.division}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, division: value }))
                        }
                        required
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Select your division" />
                        </SelectTrigger>
                        <SelectContent>
                          {DIVISIONS.map((d) => (
                            <SelectItem key={d} value={d}>
                              Division {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 p-5">
              <div className="mb-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                  Internship Details
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Company, domain, duration, and internship schedule.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter company name"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        companyName: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyLocation">Company Location *</Label>
                  <Input
                    id="companyLocation"
                    placeholder="City, State/Country"
                    value={formData.companyLocation}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        companyLocation: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain">Internship Domain *</Label>
                  <Input
                    id="domain"
                    placeholder="e.g., Web Development, Data Science"
                    value={formData.domain}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        domain: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode">Internship Mode *</Label>
                  <Select
                    value={formData.mode}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, mode: value }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationWeeks">Duration (in weeks) *</Label>
                  <Input
                    id="durationWeeks"
                    type="number"
                    min="1"
                    placeholder="e.g., 8"
                    value={formData.durationWeeks}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        durationWeeks: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stipend">Stipend *</Label>
                  <Select
                    value={formData.stipend}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        stipend: value,
                        stipendAmount:
                          value === "paid" ? prev.stipendAmount : "",
                      }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stipend type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showStipendAmountField && (
                  <div className="space-y-2">
                    <Label htmlFor="stipendAmount">
                      Stipend Amount (per month in INR) *
                    </Label>
                    <Input
                      id="stipendAmount"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g., 15000"
                      value={formData.stipendAmount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          stipendAmount: formatCurrencyInput(e.target.value),
                        }))
                      }
                      required={showStipendAmountField}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    readOnly
                    className="bg-gray-50"
                    required
                  />
                  <p className="text-sm text-gray-500">
                    Calculated automatically from start date and duration.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 p-5">
              <div className="mb-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                  Documents & Contacts
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add the offer letter link and the contacts used for approval
                  and attendance.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="offerLetterURL">Offer Letter URL *</Label>
                  <div className="relative">
                    <Upload className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="offerLetterURL"
                      type="url"
                      placeholder="https://drive.google.com/file/d/..."
                      value={formData.offerLetterURL}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          offerLetterURL: e.target.value,
                        }))
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Upload your offer letter to Google Drive and paste the
                    shareable link.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deptCoordinatorEmail">
                    Department Coordinator Email *
                  </Label>
                  <Input
                    id="deptCoordinatorEmail"
                    type="email"
                    placeholder="Automatically filled based on branch"
                    value={formData.deptCoordinatorEmail}
                    readOnly
                    className="bg-gray-50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hrEmail">HR Email *</Label>
                  <Input
                    id="hrEmail"
                    type="email"
                    placeholder="hr@company.com"
                    value={formData.hrEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hrEmail: e.target.value,
                      }))
                    }
                    required
                  />
                  <p className="text-sm text-gray-500">
                    HR will receive attendance verification emails.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="sm:min-w-[180px]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Form"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
